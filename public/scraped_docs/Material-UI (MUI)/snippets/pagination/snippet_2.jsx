Copy(or ⌘C)<Pagination count={10} variant="outlined" />
<Pagination count={10} variant="outlined" color="primary" />
<Pagination count={10} variant="outlined" color="secondary" />
<Pagination count={10} variant="outlined" disabled /><Pagination count={10} variant="outlined" />
<Pagination count={10} variant="outlined" color="primary" />
<Pagination count={10} variant="outlined" color="secondary" />
<Pagination count={10} variant="outlined" disabled />
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