import { PageWrapper } from "@components/page-wrapper";
import { useState, useEffect } from "react";
import { AGGridHelix } from "@helix/ag-grid";
import { HelixIcon } from "@helix/helix-icon";
import { arrow_left } from "@helix/helix-icon/outlined";

const API_PORT = import.meta.env.VITE_API_PORT || 5001;

function Queries() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [queries, setQueries] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [, setQueryDetails] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<boolean>(false);
  const [authInProgress, setAuthInProgress] = useState<boolean>(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [gridData, setGridData] = useState<{
    columnDefs: never[];
    rowData: never[];
  } | null>(null);
  const [loading, setLoading] = useState(false); // Updated loading state
  const [showGrid, setShowGrid] = useState(false);
  const [currentQueryLabel, setCurrentQueryLabel] =
    useState<string>("Queries Page"); // Track the current title

  const fetchQueryDetails = async (queryAlias: string, queryLabel: string) => {
    setLoading(true); // Set loading to true when fetching starts
    try {
      const response = await fetch(
        `http://localhost:${API_PORT}/execute-query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query_alias: queryAlias }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setQueryDetails(data);

      if (data.success) {
        // Transform the data into AGGridHelix-compatible format
        const columnDefs = data.columns.map((col: string) => ({
          headerName: col
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char: string) => char.toUpperCase()),
          field: col,
          sortable: true,
          resizable: true,
          flex: 1,
        }));

        setGridData({
          columnDefs,
          rowData: data.data_table,
        });
        setShowGrid(true); // Show the grid
        setCurrentQueryLabel(queryLabel); // Update the title to the query label
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false); // Set loading to false when fetching is complete
    }
  };

  const fetchQueries = async () => {
    try {
      const response = await fetch(
        `http://localhost:${API_PORT}/execute-query`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setQueries(data.available_queries);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`http://localhost:${API_PORT}/auth/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setAuthStatus(data.authenticated);
      setAuthInProgress(data.auth_in_progress);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  const startAuth = async () => {
    try {
      const response = await fetch(`http://localhost:${API_PORT}/auth/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setDeviceCode(data.device_code);
      setVerificationUri(data.verification_uri);
      setAuthInProgress(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (authStatus) {
      fetchQueries();
    }
  }, [authStatus]);

  return (
    <PageWrapper>
      <div
        className='helix-d-flex helix-flex-direction--column helix-gap-4 helix-pt-5 helix-px-6'
        style={{ height: "calc(100dvh - 68px)", overflow: "auto" }}
      >
        <h1>{currentQueryLabel}</h1> {/* Dynamically update the title */}
        {showGrid && (
          <div>
            <button
              className='helix-btn helix-btn--primary helix-mb-4'
              onClick={() => {
                setShowGrid(false);
                setCurrentQueryLabel("Queries Page"); // Reset the title when going back
              }}
            >
              <HelixIcon icon={arrow_left} className='helix-mr-2' />
              Back to Queries
            </button>
          </div>
        )}
        {!authStatus && !authInProgress && (
          <div>
            <p>You need to authenticate to access queries.</p>
            <button
              onClick={startAuth}
              className='helix-btn helix-btn--primary'
            >
              Start Authentication
            </button>
          </div>
        )}
        {authInProgress && (
          <div>
            <p>Authentication in progress. Please visit:</p>
            <p>
              <a
                href={verificationUri || "#"}
                target='_blank'
                rel='noopener noreferrer'
              >
                {verificationUri}
              </a>
            </p>
            <p>Enter the code: {deviceCode}</p>
          </div>
        )}
        {authStatus && (
          <div>
            {!showGrid && !loading && (
              <div className='helix-d-flex helix-flex-direction--column helix-gap-3'>
                {queries ? (
                  Object.entries(queries).map(([key, query]) => {
                    const typedQuery = query as {
                      name: string;
                      description?: string;
                    };
                    return (
                      <div key={key} className='helix-card'>
                        <div className='helix-card__body helix-d-flex helix-justify--between helix-align--center helix-gap-2 '>
                          <div>
                            <h3 className='helix-mb-2'>{typedQuery.name}</h3>
                            <p>{typedQuery.description}</p>
                          </div>
                          <button
                            className='helix-btn helix-btn--secondary'
                            onClick={() =>
                              fetchQueryDetails(key, typedQuery.name)
                            }
                          >
                            Load Query
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p>No queries available. Please try again later.</p>
                )}
              </div>
            )}
            {loading && <div>Loading...</div>} {/* Show loading state */}
            {showGrid && gridData && !loading && (
              <div>
                <div style={{ height: "500px", width: "100%" }}>
                  <AGGridHelix
                    height='500px'
                    columnDefs={gridData.columnDefs}
                    rowData={gridData.rowData}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </PageWrapper>
  );
}

export default Queries;
