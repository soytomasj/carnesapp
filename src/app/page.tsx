import CateringApp from "@/components/catering-app";
import { LoginGate } from "@/components/login-gate";

export default function Home() {
  return (
    <LoginGate>
      <CateringApp />
    </LoginGate>
  );
}
