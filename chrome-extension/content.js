// Content script - runs on the target page
console.log('Form Auto-Filler extension loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    fillFormFields(request.data);
    sendResponse({ success: true });
  }
  return true;
});
