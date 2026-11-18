package io.github.trypartylol_max.shaah;
public class BadgePolicyTest {
    public static void main(String[] args) {
        long now=1700000000000L;
        if (!BadgePolicy.valid(0,now+1000,now) || !BadgePolicy.valid(57,now+86400000,now)) throw new AssertionError("valid count rejected");
        double[] invalid={-1,0.5,10001,Double.NaN,Double.POSITIVE_INFINITY};
        for(double n:invalid) if(BadgePolicy.valid(n,now+1000,now)) throw new AssertionError("invalid count accepted");
        for(double end:new double[]{now,now-1,now+37L*3600000,Double.NaN,now+0.5})
            if(BadgePolicy.valid(3,end,now)) throw new AssertionError("invalid expiry accepted");
        System.out.println("PASS native counter policy: bounds, integer counts, expiry and invalid numeric inputs");
    }
}
