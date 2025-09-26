import { describe, expect, it } from "vitest";

function applyCoeff(planned: number, coeff: number) {
  return planned * coeff;
}

describe("係数計算", () => {
  it("planned と coeff の積を返す", () => {
    expect(applyCoeff(10, 1.2)).toBeCloseTo(12);
  });
});
