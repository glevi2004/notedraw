import clsx from "clsx";

import { useTunnels } from "../../context/tunnels";
import { useUIAppState } from "../../context/ui-appState";

const FooterRight = ({ children }: { children?: React.ReactNode }) => {
  const { FooterRightTunnel } = useTunnels();
  const appState = useUIAppState();
  return (
    <FooterRightTunnel.In>
      <div
        className={clsx("footer-right zen-mode-transition", {
          "transition-right": appState.zenModeEnabled,
        })}
      >
        {children}
      </div>
    </FooterRightTunnel.In>
  );
};

export default FooterRight;
FooterRight.displayName = "FooterRight";
