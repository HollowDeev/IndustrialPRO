import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('Deve realizar o login com sucesso usando credenciais corretas', async ({ page }) => {
    // Acesse a página raiz, que deve redirecionar ou mostrar a tela de login
    await page.goto('/');

    // A tela de login (em /login ou no componente Auth) tem os campos de email e senha
    await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'teste@helpe.com.br'); 
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD || '123456'); 

    // Clique no botão de login
    // Precisamos de um seletor específico, mas normalmente o botão tem o texto "Entrar" ou o type="submit"
    await page.click('button[type="submit"]');

    // Após o login com sucesso, o painel principal (Dashboard) deve aparecer.
    // Vamos esperar um elemento típico do Dashboard
    // Por exemplo, o título "Dashboard de Produção" ou o botão "NOVO PEDIDO"
    await expect(page.locator('text=Dashboard de Produção').first()).toBeVisible({ timeout: 10000 });
  });

  test('Deve exibir erro ao tentar logar com credenciais inválidas', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="email"]', 'invalido@helpe.com.br');
    await page.fill('input[type="password"]', 'senha_errada');
    await page.click('button[type="submit"]');

    // Verifica se a mensagem de erro aparece. (Neste caso: E-mail ou senha incorretos.)
    await expect(page.locator('text=E-mail ou senha incorretos.').or(page.locator('text=Ocorreu um erro'))).toBeVisible({ timeout: 10000 });
  });
});
