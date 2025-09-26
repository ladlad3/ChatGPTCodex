import { test, expect } from "@playwright/test";

test.describe("プロジェクトからダッシュボードまでの流れ", () => {
  test("タイトルが表示される", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByText("スケジュール管理")).toBeVisible();
  });
});
