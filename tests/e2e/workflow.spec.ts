import { test, expect } from '@playwright/test';

// Use a hook to login before all tests in this file
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'teste@helpe.com.br'); 
  await page.fill('input[type="password"]', process.env.TEST_PASSWORD || '123456'); 
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Dashboard de Produção').first()).toBeVisible({ timeout: 10000 });
});

test.describe('Navegação e Atalhos', () => {
  test('Deve alternar entre as abas do SideNavBar', async ({ page }) => {
    // Clica em Almoxarifado
    await page.click('text=Almoxarifado');
    await expect(page.locator('text=Matérias-Primas').first()).toBeVisible();

    // Abre o dropdown de Cadastros e clica em Funcionários
    await page.click('text=Cadastros');
    await page.click('text=Funcionários');
    await expect(page.locator('text=Gestão de Funcionários').first()).toBeVisible();
  });

  test('Atalho S deve colapsar o menu lateral', async ({ page }) => {
    // A barra começa com w-64
    const aside = page.locator('aside');
    await expect(aside).toHaveClass(/w-64/);

    // Dispara a tecla 's'
    await page.keyboard.press('s');

    // A barra deve mudar para w-20
    await expect(aside).toHaveClass(/w-20/);
  });
});

test.describe('Novo Pedido', () => {
  test('Deve abrir o modal de novo pedido via atalho N e testar os toasts', async ({ page }) => {
    // Certificar-se que está no dashboard
    await page.click('text=Dashboard');

    // Dispara a tecla 'n' para abrir modal
    await page.keyboard.press('n');
    // Verifica se o modal apareceu (texto "Cadastrar Novo Pedido Geral")
    await expect(page.locator('text=Cadastrar Novo Pedido Geral')).toBeVisible();

    // Tentar submeter sem preencher nada para acionar o toast
    await page.click('button[type="submit"]');

    // Verificar se o toast de aviso "Preencha os campos obrigatórios" apareceu
    await expect(page.locator('text=Preencha os campos obrigatórios')).toBeVisible();
  });
});
