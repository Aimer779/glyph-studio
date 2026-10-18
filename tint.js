// Sparse, repeatable accents: new positions each cycle, never tied to a glyph.
function accentRandom(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}
function makeTintClusters(candidates, epoch, config = settings) {
  if (!candidates.length || config.tintClusters === 0) return [];
  const clusters = [];
  const count = config.tintClusters;
  for (let i = 0; i < count * 32 && clusters.length < count; i++) {
    const cell = candidates[Math.floor(accentRandom(epoch * 97 + i * 13) * candidates.length)];
    if (clusters.some(other => Math.hypot(other.x - cell.x, other.y - cell.y) < 90)) continue;
    const seed = epoch * 113 + i * 31;
    const radius = Math.max(30, 44 * Math.sqrt(config.tintScale / 90), Math.sqrt(config.tintGlyphs) * 18);
    const neighbors = candidates.filter(other => other !== cell && Math.hypot(other.x - cell.x, other.y - cell.y) <= radius)
      .map((other, index) => ({ ...other, rank: accentRandom(seed + index * 7) }))
      .sort((a, b) => a.rank - b.rank);
    if (neighbors.length < config.tintGlyphs - 1) continue;
    const members = [cell];
    if (config.tintGlyphs >= 2) members.push(neighbors[0]);
    if (config.tintGlyphs >= 3) {
    const second = neighbors[0];
    // A non-collinear third glyph prevents horizontal, vertical and diagonal bars.
    const third = neighbors.find(other =>
      (second.x - cell.x) * (other.y - cell.y) !== (second.y - cell.y) * (other.x - cell.x));
    if (!third) continue;
    members.push(third);
    }
    for (const neighbor of neighbors) {
      if (members.length >= config.tintGlyphs) break;
      if (!members.includes(neighbor)) members.push(neighbor);
    }
    if (members.some(member => clusters.some(cluster => cluster.members.some(other => other.x === member.x && other.y === member.y)))) continue;
    clusters.push({ x: cell.x, y: cell.y,
      start: epoch * (config.tintDuration + 0.6) + clusters.length * 0.025,
      members: members.map((member, index) => ({ x: member.x, y: member.y,
        weight: 0.82 + accentRandom(seed + index * 17) * 0.18 })) });
  }
  return clusters;
}
function glyphTint(x, y, time, wave, config = settings, clusters = []) {
  if (config.tint === 0 || config.tintClusters === 0) return 0;
  let accent = 0;
  for (const cluster of clusters) {
    const age = time - cluster.start;
    if (age <= 0 || age >= config.tintDuration) continue;
    const member = cluster.members.find(point => point.x === x && point.y === y);
    if (!member) continue;
    const pulse = smoothstep(0, 0.18, age)
      * (1 - smoothstep(config.tintDuration - 0.45, config.tintDuration, age));
    accent = Math.max(accent, member.weight * pulse);
  }
  const crestProtection = 1 - smoothstep(0.18, 0.4, wave);
  const boost = 1 + config.tintWave * smoothstep(0.005, 0.08, wave);
  return Math.min(1, config.tint * accent * boost) * crestProtection;
}
