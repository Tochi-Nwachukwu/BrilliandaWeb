import { NotConnected } from "@/components/school/NotConnected";
import { LIVE } from "@/data/source";

// No backend for this yet (after v1): on the real API it says so instead of showing sample data.
export default function Layout({ children }: { children: React.ReactNode }) {
  return LIVE ? <NotConnected title="Timetable" /> : children;
}
