"use client";
import { ThemeProvider as Provider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster richColors position="top-center" />
    </Provider>
  );
}
