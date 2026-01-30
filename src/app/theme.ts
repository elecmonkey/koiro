import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2d6b5f",
      light: "#4b8e80",
      dark: "#204c44",
    },
    secondary: {
      main: "#8b5b3b",
      light: "#a46b45",
      dark: "#5a3b27",
    },
    background: {
      default: "#f6f3ef",
      paper: "#fdfaf6",
    },
    text: {
      primary: "#1f1a16",
      secondary: "#51473f",
    },
  },
  shape: {
    borderRadius: 6,
  },
  typography: {
    fontFamily: 'var(--font-body), "Zen Kaku Gothic New", sans-serif',
    h1: {
      fontFamily: 'var(--font-display), "Shippori Mincho B1", serif',
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: 'var(--font-display), "Shippori Mincho B1", serif',
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontFamily: 'var(--font-display), "Shippori Mincho B1", serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'var(--font-display), "Shippori Mincho B1", serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: "100vh",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(45,107,95,0.12), transparent 45%), radial-gradient(circle at 20% 40%, rgba(139,91,59,0.12), transparent 45%), linear-gradient(180deg, #fdfaf6 0%, #f6f3ef 100%)",
          backgroundAttachment: "fixed",
        },
        a: {
          color: "inherit",
          textDecoration: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(31, 26, 22, 0.08)",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          paddingInline: 18,
          paddingBlock: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});
