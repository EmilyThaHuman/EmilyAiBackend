Copy(or ⌘C)<Button onClick={handleClick(GrowTransition)}>Grow Transition</Button>
<Button onClick={handleClick(Fade)}>Fade Transition</Button>
<Button onClick={handleClick(SlideTransition)}>Slide Transition</Button>
<Snackbar
  open={state.open}
  onClose={handleClose}
  TransitionComponent={state.Transition}
  message="I love snacks"
  key={state.Transition.name}
  autoHideDuration={1200}
/><Button onClick={handleClick(GrowTransition)}>Grow Transition</Button>
<Button onClick={handleClick(Fade)}>Fade Transition</Button>
<Button onClick={handleClick(SlideTransition)}>Slide Transition</Button>
<Snackbar
  open={state.open}
  onClose={handleClose}
  TransitionComponent={state.Transition}
  message="I love snacks"
  key={state.Transition.name}
  autoHideDuration={1200}
/>
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