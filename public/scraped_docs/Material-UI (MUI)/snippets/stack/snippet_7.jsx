import { ThemeProvider, createTheme } from "@mui/material/styles";
import Stack from "@mui/material/Stack";
const theme = createTheme({
  components: {
    MuiStack: {
      defaultProps: {
        useFlexGap: true
      }
    }
  }
});
function App() {
  return (
    <ThemeProvider theme={theme}>
      <Stack>…</Stack> {}
    </ThemeProvider>
  );
}
