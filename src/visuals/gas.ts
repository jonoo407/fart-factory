export function spawnGas(stinkiness: number, volume: number): void {
  const overlay = document.getElementById('gasOverlay');
  if (!overlay) return;
  const count = 3 + stinkiness;
  const colors = [
    'rgba(0,200,0,',
    'rgba(100,200,0,',
    'rgba(200,200,0,',
    'rgba(150,100,0,',
  ];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const cloud = document.createElement('div');
      cloud.className = 'gas-cloud';
      const size = 30 + stinkiness * 15 + volume * 5;
      cloud.style.width = size + 'px';
      cloud.style.height = size + 'px';
      cloud.style.left = Math.random() * 80 + 10 + '%';
      cloud.style.top = Math.random() * 60 + 20 + '%';
      const c = colors[Math.min(Math.floor(stinkiness / 3), 3)];
      cloud.style.background =
        'radial-gradient(circle,' + c + (0.2 + stinkiness * 0.05) + '),transparent)';
      overlay.appendChild(cloud);
      setTimeout(() => cloud.remove(), 3000);
    }, i * 150);
  }
}
