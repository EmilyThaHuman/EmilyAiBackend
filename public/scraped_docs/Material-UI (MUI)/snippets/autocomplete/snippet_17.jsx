<Autocomplete
  onKeyDown={(event) => {
    if (event.key === "Enter") {
      event.defaultMuiPrevented = true;
    }
  }}
/>;
