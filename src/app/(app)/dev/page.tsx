import type { Metadata } from "next";
import { Gallery } from "./Gallery";

export const metadata: Metadata = { title: "Gallery" };

export default function DevHome() {
  return <Gallery />;
}
