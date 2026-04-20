export default function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    while (value >= k && i < sizes.length - 1) {
        value /= k;
        i++;
    }
    return `${value.toFixed(1)} ${sizes[i]}`;
}
