package io.github.trypartylol_max.shaah;
final class BadgePolicy {
    static boolean valid(double count, double expiry, long now) {
        return Double.isFinite(count) && count == Math.floor(count) && count >= 0 && count <= 10000
            && Double.isFinite(expiry) && expiry == Math.floor(expiry)
            && expiry > now && expiry <= now + 36L * 60 * 60 * 1000;
    }
}
