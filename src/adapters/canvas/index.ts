export class CanvasAdapter {
  platform = "Canvas";

  isMatch(url: string): boolean {
    return url.includes('instructure.com') || url.includes('canvas.');
  }

  setupNavigationListener(onNavigate: () => void) {
    // Canvas uses SPA navigation, so we can listen to history changes or MutationObserver
    let lastUrl = location.href;
    
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        onNavigate();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also listen to popstate
    window.addEventListener('popstate', () => {
       if (location.href !== lastUrl) {
          lastUrl = location.href;
          onNavigate();
       }
    });
  }
}
