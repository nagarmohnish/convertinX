import torch
import numpy as np
from pathlib import Path
from pydub import AudioSegment
from scipy.io import wavfile

from app.models.model_manager import ModelManager
from app.utils.file_utils import get_job_output_dir


def _load_audio_as_tensor(audio_path: str, target_sr: int) -> torch.Tensor:
    """Load audio file using pydub (FFmpeg) and convert to torch tensor (channels, samples)."""
    audio = AudioSegment.from_file(audio_path)
    audio = audio.set_frame_rate(target_sr)

    samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
    max_val = float(2 ** (audio.sample_width * 8 - 1))
    samples = samples / max_val

    if audio.channels > 1:
        samples = samples.reshape(-1, audio.channels).T
    else:
        samples = np.stack([samples, samples])

    return torch.from_numpy(samples)


def _save_wav(tensor: torch.Tensor, path: str, samplerate: int):
    """Save a (channels, samples) torch tensor as a WAV file using scipy."""
    wav_np = tensor.numpy()
    # Clip to [-1, 1] to prevent distortion
    wav_np = np.clip(wav_np, -1.0, 1.0)
    # Convert to int16
    wav_int16 = (wav_np * 32767).astype(np.int16)
    # scipy expects (samples, channels) for stereo
    if wav_int16.ndim == 2:
        wav_int16 = wav_int16.T
    wavfile.write(path, samplerate, wav_int16)


def separate_vocals(
    audio_path: str,
    job_id: str,
    model_manager: ModelManager,
) -> dict:
    """
    Separate audio into vocals and instrumental tracks using Demucs.

    Returns dict with:
        vocals_path: path to isolated vocals WAV
        instrumental_path: path to instrumental WAV
        sample_rate: int
    """
    from demucs.apply import apply_model

    model = model_manager.get_demucs()
    device = next(model.parameters()).device
    sr = model.samplerate  # 44100 for htdemucs

    # Load audio using pydub (FFmpeg), resample to model's expected rate
    wav = _load_audio_as_tensor(audio_path, sr)

    # Normalize
    ref = wav.mean(0)
    wav_mean = ref.mean()
    wav_std = ref.std()
    if wav_std == 0:
        wav_std = torch.tensor(1.0)
    wav_normed = (wav - wav_mean) / wav_std

    # Add batch dimension: (channels, samples) -> (1, channels, samples)
    wav_batch = wav_normed.unsqueeze(0).to(device)

    # Apply Demucs model
    with torch.no_grad():
        sources = apply_model(model, wav_batch, device=device, progress=False)

    # sources: (1, num_sources, channels, samples)
    sources = sources[0]  # Remove batch dim

    # htdemucs sources: ['drums', 'bass', 'other', 'vocals']
    source_names = model.sources
    vocals_idx = source_names.index("vocals")

    vocals = sources[vocals_idx]
    # Instrumental = everything except vocals
    instrumental = sources.sum(dim=0) - vocals

    # Denormalize
    vocals = vocals * wav_std + wav_mean
    instrumental = instrumental * wav_std + wav_mean

    # Save to job output directory
    output_dir = get_job_output_dir(job_id)
    vocals_path = output_dir / "separated_vocals.wav"
    instrumental_path = output_dir / "separated_instrumental.wav"

    _save_wav(vocals.cpu(), str(vocals_path), sr)
    _save_wav(instrumental.cpu(), str(instrumental_path), sr)

    return {
        "vocals_path": str(vocals_path),
        "instrumental_path": str(instrumental_path),
        "sample_rate": sr,
    }


def separate_all_stems(
    audio_path: str,
    job_id: str,
    model_manager: ModelManager,
) -> dict:
    """
    Separate audio into all 4 Demucs stems: drums, bass, other, vocals.
    Returns dict with paths to each stem WAV file.
    """
    from demucs.apply import apply_model

    model = model_manager.get_demucs()
    device = next(model.parameters()).device
    sr = model.samplerate

    wav = _load_audio_as_tensor(audio_path, sr)

    ref = wav.mean(0)
    wav_mean = ref.mean()
    wav_std = ref.std()
    if wav_std == 0:
        wav_std = torch.tensor(1.0)
    wav_normed = (wav - wav_mean) / wav_std

    wav_batch = wav_normed.unsqueeze(0).to(device)

    with torch.no_grad():
        sources = apply_model(model, wav_batch, device=device, progress=False)

    sources = sources[0]  # Remove batch dim
    source_names = model.sources  # ['drums', 'bass', 'other', 'vocals']

    output_dir = get_job_output_dir(job_id)
    result = {"sample_rate": sr}

    for i, name in enumerate(source_names):
        stem = sources[i] * wav_std + wav_mean
        stem_path = output_dir / f"stem_{name}.wav"
        _save_wav(stem.cpu(), str(stem_path), sr)
        result[f"{name}_path"] = str(stem_path)

    return result
