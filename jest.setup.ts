import { resetRateLimitForTests } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitForTests();
});
