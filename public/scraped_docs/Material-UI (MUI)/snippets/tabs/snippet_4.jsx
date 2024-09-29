Copy(or ⌘C)<Tabs
  value={value}
  onChange={handleChange}
  aria-label="wrapped label tabs example"
>
  <Tab
    value="one"
    label="New Arrivals in the Longest Text of Nonfiction that should appear in the next line"
    wrapped
  />
  <Tab value="two" label="Item Two" />
  <Tab value="three" label="Item Three" />
</Tabs><Tabs
  value={value}
  onChange={handleChange}
  aria-label="wrapped label tabs example"
>
  <Tab
    value="one"
    label="New Arrivals in the Longest Text of Nonfiction that should appear in the next line"
    wrapped
  />
  <Tab value="two" label="Item Two" />
  <Tab value="three" label="Item Three" />
</Tabs>
/**
 * Reset the text fill color so that placeholder is visible
 */
.npm__react-simple-code-editor__textarea:empty {
  -webkit-text-fill-color: inherit !important;
}

/**
 * Hack to apply on some CSS on IE10 and IE11
 */
@media all and (-ms-high-contrast: none), (-ms-high-contrast: active) {
  /**
    * IE doesn't support '-webkit-text-fill-color'
    * So we use 'color: transparent' to make the text transparent on IE
    * Unlike other browsers, it doesn't affect caret color in IE
    */
  .npm__react-simple-code-editor__textarea {
    color: transparent !important;
  }

  .npm__react-simple-code-editor__textarea::selection {
    background-color: #accef7 !important;
    color: transparent !important;
  }
}
Press Enter to start editing