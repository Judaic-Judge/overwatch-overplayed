import AppNavigation from "@/components/navigation/AppNavigation";

type PlannerLayoutProps = {
  children: React.ReactNode;
};

export default function PlannerLayout({ children }: PlannerLayoutProps) {
  return <AppNavigation>{children}</AppNavigation>;
}