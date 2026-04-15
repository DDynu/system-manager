export const mockMetrics = {
  cpu: 45,
  memory: { used: 12.4, total: 32, unit: 'GB', percent: 39 },
  disk: { used: 245, total: 1000, unit: 'GB', percent: 25 },
  uptime: '14d 3h 22m',
  temperature: 62,
  network: { upload: 12.5, download: 45.2, unit: 'MB/s' },
  processes: 127,
  status: 'healthy'
};

export const cpuHistory = Array.from({ length: 24 }, (_, i) => ({
  time: `${i.toString().padStart(2, '0')}:00`,
  value: Math.floor(Math.random() * 60) + 20
}));

export const memoryHistory = Array.from({ length: 24 }, (_, i) => ({
  time: `${i.toString().padStart(2, '0')}:00`,
  value: Math.floor(Math.random() * 30) + 30
}));

export const diskIOHistory = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 2}:00`,
  read: Math.floor(Math.random() * 200) + 50,
  write: Math.floor(Math.random() * 150) + 30
}));

export const processes = [
  { id: 1, name: 'systemd', pid: 1, cpu: 0.1, memory: 0.5, status: 'running' },
  { id: 2, name: 'docker', pid: 1234, cpu: 2.3, memory: 4.2, status: 'running' },
  { id: 3, name: 'node', pid: 2345, cpu: 15.7, memory: 8.1, status: 'running' },
  { id: 4, name: 'postgres', pid: 3456, cpu: 5.2, memory: 12.4, status: 'running' },
  { id: 5, name: 'redis', pid: 4567, cpu: 1.1, memory: 2.8, status: 'running' },
  { id: 6, name: 'nginx', pid: 5678, cpu: 0.8, memory: 1.2, status: 'running' },
  { id: 7, name: 'cron', pid: 6789, cpu: 0.0, memory: 0.3, status: 'sleeping' },
  { id: 8, name: 'sshd', pid: 7890, cpu: 0.2, memory: 0.8, status: 'running' }
];

export const alerts = [
  { id: 1, type: 'warning', message: 'CPU usage above 80% threshold', time: '2h ago' },
  { id: 2, type: 'info', message: 'Scheduled maintenance in 24h', time: '5h ago' }
];
