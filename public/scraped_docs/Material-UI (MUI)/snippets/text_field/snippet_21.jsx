import { GlobalStyles, createTheme, ThemeProvider } from "@mui/material";
const theme = createTheme({
  components: {
    MuiInputBase: {
      defaultProps: {
        disableInjectingGlobalStyles: true
      }
    }
  }
});
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          "@keyframes mui-auto-fill": { from: { display: "block" } },
          "@keyframes mui-auto-fill-cancel": { from: { display: "block" } }
        }}
      />
      ...
    </ThemeProvider>
  );
}
