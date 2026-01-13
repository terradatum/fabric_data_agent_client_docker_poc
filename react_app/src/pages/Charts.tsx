import { PageWrapper } from "@components/page-wrapper";
import { useState, useEffect } from "react";

const API_PORT = import.meta.env.VITE_API_PORT || 5001;

function Charts() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [queries, setQueries] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [queryDetails, setQueryDetails] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<boolean>(false);
  const [authInProgress, setAuthInProgress] = useState<boolean>(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);

  const fetchQueryDetails = async (queryAlias: string) => {
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
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
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
        <h1>Charts Page</h1>
        {!authStatus && !authInProgress && (
          <div>
            <p>You need to authenticate to access queries.</p>
            <button onClick={startAuth}>Start Authentication</button>
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
            <div className='helix-d-flex helix-flex-direction--column helix-gap-3'>
              {queries ? (
                Object.entries(queries).map(([key, query]) => {
                  const typedQuery = query as {
                    name: string;
                    description?: string;
                  };
                  return (
                    <div
                      key={key}
                      onClick={() => fetchQueryDetails(key)}
                      className='helix-card'
                    >
                      <div className='helix-card__body'>
                        <h3>{typedQuery.name}</h3>
                        <p>{typedQuery.description}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p>No queries available. Please try again later.</p>
              )}
            </div>
            {queryDetails && (
              <div>
                <h2>Query Details</h2>
                <pre>{JSON.stringify(queryDetails, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </PageWrapper>
  );
}

export default Charts;
