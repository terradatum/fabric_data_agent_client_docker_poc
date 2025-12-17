import { Navbar, NavbarBody, NavbarIconAction } from "@helix/navbar";
import { useAI } from "@context/useAI";
import { HelixIcon } from "@helix/helix-icon";
import { arrow_left } from "@helix/helix-icon/outlined";
import { SidebarNav, Topbar } from "@components/sidebar-menu";

const PageWrapper = ({
  children,
  showHistory,
  setShowHistory,
  previousPageContext,
  setResponses,
}: {
  children: React.ReactNode;
  showHistory?: boolean;
  setShowHistory?: (show: boolean) => void;
  previousPageContext?: "default" | "results";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setResponses?: (responses: any[]) => void;
}) => {
  const { responses } = useAI();

  const handleBackClick = () => {
    if (showHistory && setShowHistory && setResponses) {
      // Handle back from history
      setShowHistory(false);
      if (previousPageContext === "default" && responses.length > 0) {
        // Clear responses to return to default landing page
        setResponses([]);
      }
    } else if (setResponses) {
      // Handle regular back (clear responses)
      setResponses([]);
    }
  };
  return (
    <div className='helix-d-flex'>
      <SidebarNav />
      <div className='helix-d-flex helix-flex-1 helix-flex-direction--column'>
        <Topbar>
          <>
            {responses.length > 0 || showHistory ? (
              <button
                className='helix-btn helix-btn--ghost'
                onClick={handleBackClick}
                style={{}}
                aria-label={showHistory ? "Close history" : "Go back"}
              >
                <HelixIcon
                  icon={arrow_left}
                  className='helix-mr-1 helix-svg-fill--brand'
                />
                <span className='helix-text-brand'>Back</span>
              </button>
            ) : null}
          </>
        </Topbar>
        <main className='helix-container--fluid'>{children}</main>
      </div>
    </div>
  );
};
export default PageWrapper;
