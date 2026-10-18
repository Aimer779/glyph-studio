function rippleOpacity(distance, age, kind = 'click', config = settings) {
  if (age < 0) return 0;
  const hover = kind === 'hover';
  const speed = hover ? 125 : config.speed;
  const step = hover ? 0 : config.step;
  const arrivalDistance = step > 0 ? Math.round(distance / step) * step : distance;
  const localTime = age - arrivalDistance / speed;
  const width = hover ? 15 : config.width;
  const phase = localTime * speed / width;
  const soft = Math.exp(-0.5 * phase * phase);
  const hard = Math.max(0, Math.min(1, (1 - Math.abs(phase)) / 0.15));
  const softness = hover ? 1 : config.softness;
  const front = hard * (1 - softness) + soft * softness;
  const wake = localTime > 0
    ? (1 - Math.exp(-localTime / 0.06)) * Math.exp(-localTime / config.wakeLife)
    : 0;
  const attack = Math.min(1, age / 0.06);
  const fade = attack * attack * (3 - 2 * attack);
  const attenuation = Math.exp(-age * (hover ? 2.2 : config.decay));
  return ((hover ? config.hover : config.peak) * front
    + (hover ? config.hover * 0.4 : config.wake) * wake) * fade * attenuation;
}
