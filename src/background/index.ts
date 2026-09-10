/**
 * UMichScribe Background Service Worker / Event Script
 * Handles lifecycle events such as automatic content script injection into pre-existing tabs upon install.
 */

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const manifest = chrome.runtime.getManifest();
    const contentScripts = manifest.content_scripts || [];

    for (const cs of contentScripts) {
      if (!cs.matches || !cs.js) continue;

      for (const matchPattern of cs.matches) {
        try {
          const tabs = await chrome.tabs.query({ url: matchPattern });
          for (const tab of tabs) {
            if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id, allFrames: cs.all_frames ?? false },
                  files: cs.js
                });
              } catch (tabErr) {
                // Tab or frame might be discarded, protected, or inactive; safely ignore
              }
            }
          }
        } catch (queryErr) {
          // Tab query error for specific match pattern; safely ignore
        }
      }
    }
  } catch (err) {
    console.warn('[UMichScribe] Background onInstalled auto-injection encountered an error:', err);
  }
});
