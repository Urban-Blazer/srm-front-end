
export function getSinceTimestamp(range: string): number {
    const now = Date.now();
    const olddest = new Date("12-31-2024").getTime();
    switch (range) {
        case "1h": return now - 1 * 60 * 60 * 1000;
        case "6h": return now - 6 * 60 * 60 * 1000;
        case "12h": return now - 12 * 60 * 60 * 1000;
        case "24h": return now - 24 * 60 * 60 * 1000;
        case "7d": return now - 7 * 24 * 60 * 60 * 1000;
        case "30d": return now - 30 * 24 * 60 * 60 * 1000;
        case "30d": return now - 30 * 24 * 60 * 60 * 1000;
        case "lifetime": return olddest;
        default: return 0;
    }
}