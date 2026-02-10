import { describe, it, expect } from 'vitest';
import router from '@/router/index';

describe('Router', () => {
  it('should be defined', () => {
    expect(router).toBeDefined();
  });

  it('should have routes configured', () => {
    const routes = router.getRoutes();
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have root redirect to /tabs/tab1', () => {
    const routes = router.getRoutes();
    const rootRoute = routes.find(route => route.path === '/');
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.redirect).toBe('/tabs/tab1');
  });

  it('should have /tabs/ route', () => {
    const routes = router.getRoutes();
    const tabsRoute = routes.find(route => route.path === '/tabs/');
    expect(tabsRoute).toBeDefined();
  });

  it('should have tab1 route', () => {
    const routes = router.getRoutes();
    const tab1Route = routes.find(route => route.path === '/tabs/tab1');
    expect(tab1Route).toBeDefined();
  });

  it('should have tab2 route', () => {
    const routes = router.getRoutes();
    const tab2Route = routes.find(route => route.path === '/tabs/tab2');
    expect(tab2Route).toBeDefined();
  });

  it('should have tab3 route', () => {
    const routes = router.getRoutes();
    const tab3Route = routes.find(route => route.path === '/tabs/tab3');
    expect(tab3Route).toBeDefined();
  });

  it('should have tab4 route', () => {
    const routes = router.getRoutes();
    const tab4Route = routes.find(route => route.path === '/tabs/tab4');
    expect(tab4Route).toBeDefined();
  });

  it('should redirect /tabs/ to /tabs/tab1', () => {
    const routes = router.getRoutes();
    // Find the tabs children
    const tabsChildren = routes.filter(route => route.path.startsWith('/tabs/'));
    const emptyTabsRoute = tabsChildren.find(route => route.path === '/tabs/');
    expect(emptyTabsRoute?.redirect).toBe('/tabs/tab1');
  });

  it('should use web history', () => {
    expect(router.options.history).toBeDefined();
  });

  it('should have correct number of main routes', () => {
    // Main routes: /, /tabs/
    const routes = router.getRoutes();
    const mainRoutes = routes.filter(route => !route.path.includes('/tabs/tab'));
    expect(mainRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('should lazy load tab pages', async () => {
    const routes = router.getRoutes();
    const tab1Route = routes.find(route => route.path === '/tabs/tab1');
    
    expect(tab1Route).toBeDefined();
    // Tab routes should have component defined
    if (tab1Route?.components) {
      expect(tab1Route.components.default).toBeDefined();
    }
  });

  it('should navigate to tab1', async () => {
    await router.push('/tabs/tab1');
    expect(router.currentRoute.value.path).toBe('/tabs/tab1');
  });

  it('should navigate to tab2', async () => {
    await router.push('/tabs/tab2');
    expect(router.currentRoute.value.path).toBe('/tabs/tab2');
  });

  it('should navigate to tab3', async () => {
    await router.push('/tabs/tab3');
    expect(router.currentRoute.value.path).toBe('/tabs/tab3');
  });

  it('should navigate to tab4', async () => {
    await router.push('/tabs/tab4');
    expect(router.currentRoute.value.path).toBe('/tabs/tab4');
  });

  it('should navigate from root to tab1', async () => {
    await router.push('/');
    // Router should redirect to /tabs/tab1
    expect(router.currentRoute.value.path).toMatch(/tab1/);
  });
});
