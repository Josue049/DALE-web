import {expect, test} from '@playwright/test';

const isMobile = (name: string) => name === 'mobile';

test('portada: logo, CTAs operativos y escena ligada al scroll', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('img', {name: /DALE CON TODO — logotipo/}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: 'Únete a la comunidad'}).first()).toBeVisible();
  const line1 = page.locator('#hero-title').locator('..');
  await expect(line1).toHaveCSS('opacity', '0');
  // Avanza un tercio del escenario fijado: aparece «NO IMPORTA QUÉ ESTUDIES».
  await page.evaluate(() => window.scrollTo(0, (document.getElementById('top')!.offsetHeight - innerHeight) * 0.33));
  await expect.poll(async () => Number(await line1.evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.5);
});

test('navegación principal y filtros de eventos en la URL', async ({page}, info) => {
  await page.goto('/');
  if (isMobile(info.project.name)) {
    await page.getByRole('button', {name: 'Abrir menú'}).click();
    await page.getByRole('navigation', {name: 'Menú móvil'}).getByRole('link', {name: /Eventos/}).click();
  } else {
    await page.getByRole('navigation', {name: 'Principal'}).getByRole('link', {name: 'Eventos'}).click();
  }
  await expect(page).toHaveURL(/\/eventos$/);
  await expect(page.getByRole('heading', {level: 1})).toContainText(/Aprende de quienes/i);
  await page.getByRole('searchbox', {name: 'Buscar eventos'}).fill('oratoria');
  await expect(page).toHaveURL(/q=oratoria/);
  await expect(page.getByText('1 resultado')).toBeVisible();
  await page.getByRole('radio', {name: 'Calendario'}).click();
  await expect(page.getByRole('grid')).toBeVisible();
});

test('inscripción a evento: valida y nunca simula guardado', async ({page}) => {
  await page.goto('/eventos/liderar-equipos-de-distintas-carreras');
  await page.getByRole('button', {name: 'Inscribirme'}).click();
  const dialog = page.getByRole('dialog', {name: 'Inscribirme al evento'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: 'Confirmar inscripción'}).click();
  await expect(dialog).toBeVisible(); // la validación nativa bloquea el envío vacío
  await dialog.getByLabel('Nombre completo').fill('Ana Prueba');
  await dialog.getByLabel('Correo').fill('ana@example.com');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', {name: 'Confirmar inscripción'}).click();
  const preview = page.getByRole('dialog', {name: 'Formulario completo'});
  await expect(preview).toContainText('no se envió ni se guardó');
  await preview.getByRole('button', {name: 'Entendido'}).click();
  await expect(preview).toBeHidden();
});

test('concurso: navegación por secciones y armado de equipo', async ({page}) => {
  await page.goto('/concursos/desafio-impacto-multidisciplinario');
  await page.getByRole('navigation', {name: 'Secciones del concurso'}).getByRole('link', {name: 'Cronograma'}).click();
  // Lenis termina el desplazamiento suave con el título visible bajo el header.
  await expect
    .poll(() => page.locator('#h-crono').evaluate((e) => {
      const top = e.getBoundingClientRect().top;
      return top > 80 && top < innerHeight * 0.6;
    }))
    .toBe(true);
  await page.getByRole('button', {name: 'Inscribir a mi equipo'}).click();
  const d = page.getByRole('dialog', {name: 'Crear equipo e inscribirlo'});
  await d.getByLabel('Nombre del equipo').fill('Las Integrales');
  await d.getByRole('textbox', {name: /Invitar integrantes/}).fill('beto@example.com');
  await d.getByRole('button', {name: 'Añadir'}).click();
  await expect(d.getByText('beto@example.com')).toBeVisible();
  await d.getByRole('checkbox').check();
  await d.getByRole('button', {name: 'Confirmar'}).click();
  await expect(page.getByRole('dialog', {name: 'Inscripción lista'})).toContainText('1 invitación');
});

test('únete: el asistente valida cada paso', async ({page}) => {
  await page.goto('/unete');
  await page.getByRole('button', {name: 'Continuar →'}).click();
  await expect(page.getByLabel('Nombre completo')).toBeFocused();
  await page.getByLabel('Nombre completo').fill('Eva Test');
  await page.getByLabel('Correo', {exact: true}).fill('eva@example.com');
  await page.getByLabel('Carrera').selectOption('Derecho');
  await page.getByRole('button', {name: 'Continuar →'}).click();
  await page.getByRole('button', {name: 'Continuar →'}).click();
  await expect(page.getByRole('alert')).toContainText('al menos una línea');
  await page.getByRole('button', {name: /Dale Talks/}).click();
  await page.getByRole('button', {name: 'Continuar →'}).click();
  await page.getByLabel(/Acepto el tratamiento/).check();
  await page.getByRole('button', {name: 'Enviar solicitud'}).click();
  await expect(page.getByRole('dialog')).toContainText('no se envió ni se guardó');
});

test('menú móvil accesible: abre y cierra con Escape devolviendo el foco', async ({page}, info) => {
  test.skip(!isMobile(info.project.name), 'solo móvil');
  await page.goto('/eventos');
  await page.getByRole('button', {name: 'Abrir menú'}).click();
  await expect(page.getByRole('button', {name: 'Cerrar menú'})).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  const toggle = page.getByRole('button', {name: 'Abrir menú'});
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('admin: búsqueda en tabla y exportación CSV', async ({page}) => {
  await page.goto('/admin/eventos');
  await expect(page.getByRole('heading', {name: 'Eventos', level: 1})).toBeVisible();
  await page.getByRole('searchbox', {name: /Buscar en Eventos/}).fill('oratoria');
  await expect(page.getByRole('row')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exportar CSV'}).click();
  expect((await download).suggestedFilename()).toBe('eventos.csv');
});

test('jurado: el total ponderado responde a la rúbrica', async ({page}) => {
  await page.goto('/jurado');
  await page.getByRole('slider', {name: /Impacto/}).fill('10');
  await expect(page.getByRole('img', {name: /Total ponderado 37.5 sobre 100/})).toBeVisible();
});

test('404 y sin scroll horizontal en rutas clave', async ({page}) => {
  await page.goto('/ruta-inexistente');
  await expect(page.getByRole('heading', {name: /se salió de la cancha/})).toBeVisible();
  for (const r of ['/', '/eventos', '/concursos/desafio-impacto-multidisciplinario', '/comunidad', '/mi-cuenta/inscripciones', '/admin/usuarios']) {
    await page.goto(r);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, r).toBeLessThanOrEqual(0);
  }
});
