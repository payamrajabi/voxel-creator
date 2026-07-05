import { Show } from "@clerk/nextjs";
import App from "@/ui/App";
import SignInScreen from "@/ui/SignInScreen";

export default function Home() {
  return (
    <Show when="signed-in" fallback={<SignInScreen />}>
      <App />
    </Show>
  );
}
