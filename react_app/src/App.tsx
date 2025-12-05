import React from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PageWrapper } from "@components/page-wrapper";
import { PromptInput } from "@components/prompt-input";
import { History } from "@components/history";
import styles from "./App.module.css";
import { useAI } from "@context";
import { convertToAgGridData } from "@utils";
import { AGGridHelix } from "@helix/ag-grid";
import ReactMarkdown from "react-markdown";
import { HelixIcon } from "@helix/helix-icon";
import {
  x,
  zoom_in,
  search,
  printer,
  document_pdf,
  email,
} from "@helix/helix-icon/outlined";
import { SkeletonBox } from "@helix/skeleton-loader";
import { Alert } from "@helix/alert";

interface ResponseItemProps {
  item: { prompt: string; response: any; timestamp: Date };
  index: number;
  onGridReady: (params: any, index?: number) => void;
  setExpandedGrid: (grid: { index: number; gridData: any } | null) => void;
  printPdf: (gridData: any, gridApi?: any) => void;
  emailPdf: (gridData: any, gridApi?: any) => void;
  downloadPdf: (gridData: any, gridApi?: any) => void;
  gridApiRefs: React.MutableRefObject<{ [key: number]: any }>;
  showExportButtons?: boolean;
}

const ResponseItem: React.FC<ResponseItemProps> = ({
  item,
  index,
  onGridReady,
  setExpandedGrid,
  printPdf,
  emailPdf,
  downloadPdf,
  gridApiRefs,
  showExportButtons = true,
}) => {
  // Extract the clean response text and grid data from the JSON response
  let responseText = "";
  let gridData = null;

  if (typeof item.response === "object" && item.response !== null) {
    // Extract assistant message from JSON structure
    if (item.response.messages && item.response.messages.data) {
      const assistantMessage = item.response.messages.data.find(
        (msg: any) => msg.role === "assistant"
      );
      if (assistantMessage && assistantMessage.content && assistantMessage.content[0]) {
        responseText = assistantMessage.content[0].text.value;
      }
    }

    // Try to create grid data from data_table if available
    if (item.response.data_table && Array.isArray(item.response.data_table)) {
      const dataTable = item.response.data_table;
      if (dataTable.length > 0) {
        // Create column definitions from the keys of the first row
        const columnDefs = Object.keys(dataTable[0]).map((key) => ({
          headerName: key.replace(/["\[\]]/g, '').replace(/_/g, ' '), // Clean up header names and replace underscores with spaces
          field: key,
          sortable: true,
          resizable: true,
          flex: 1,
        }));

        gridData = {
          columnDefs,
          rowData: dataTable,
        };
      }
    }
  } else if (typeof item.response === "string") {
    // Fallback: handle string responses (old format or mock data)
    responseText = item.response;
    gridData = item.response.includes("|")
      ? convertToAgGridData(item.response)
      : null;
  }

  // Filter out table markup from response text for cleaner display
  const responseWithoutTable = responseText
    .split("\n")
    .filter((line: string) => !line.includes("|"))
    .join("\n")
    .trim();

  console.log("Rendering ResponseItem:", { item, gridData, responseText });

  return (
    <>
      {/* User prompt bubble */}
      <div className='helix-d-flex helix-align--end helix-flex-direction--column helix-w-100-percent'>
        <div className={styles.userRow}>
          <div style={{ flex: 1 }}>
            <div className='helix-bg-gray-200 helix-border-radius-top--md helix-border-radius-left--md helix-p-3 helix-bg--primary helix-color--white helix-w-100-percent'>
              <div>{item.prompt}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Bot response bubble */}
      {index === 0 ? (
        <Alert label='' type='info' dismissible={false}>
          <span className='helix-text--bold'>
            Please review all information.
          </span>{" "}
          As you may know, AI can make mistakes, and as the Agent, you must
          review and confirm all information provided by your assistant.
        </Alert>
      ) : (
        <div className='helix-mt-2' />
      )}
      <div className='helix-d-flex helix-justify--start helix-align--start helix-flex-direction--column helix-card helix-p-4'>
        <div className={styles.botRow}>
          <div style={{ flex: 1 }}>
            <div className='helix-bg--gray-50 helix-w-100-percent'>
              <div className='helix-mb-4'>
                <ReactMarkdown>{responseWithoutTable}</ReactMarkdown>
                {gridData && gridData.rowData.length > 0 && (
                  <div
                    className='helix-mt-4 helix-position--relative'
                    style={{
                      height: "200px",
                      width: "100%",
                    }}
                  >
                    <AGGridHelix
                      height='200px'
                      columnDefs={gridData.columnDefs as any}
                      rowData={gridData.rowData}
                      onGridReady={(params: any) => onGridReady(params, index)}
                    />
                    <button
                      className='helix-btn helix-btn--sm helix-btn--secondary helix-mt-2'
                      type='button'
                      onClick={() => setExpandedGrid({ index, gridData })}
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                      }}
                    >
                      <HelixIcon icon={zoom_in} />
                    </button>
                  </div>
                )}
              </div>
              {/* Export buttons only for final responses */}
              {showExportButtons && gridData && gridData.rowData.length > 0 && (
                <div className='helix-d-flex helix-gap-2 helix-mt-2'>
                  <button
                    className='helix-btn helix-btn--sm helix-btn--ghost'
                    type='button'
                    onClick={() => {
                      const api = gridApiRefs.current[index];
                      printPdf(gridData, api);
                    }}
                  >
                    <HelixIcon icon={printer} /> Print PDF
                  </button>
                  <button
                    className='helix-btn helix-btn--sm helix-btn--ghost'
                    type='button'
                    onClick={() => {
                      const api = gridApiRefs.current[index];
                      emailPdf(gridData, api);
                    }}
                  >
                    <HelixIcon icon={email} /> Email PDF
                  </button>
                  <button
                    className='helix-btn helix-btn--sm helix-btn--ghost'
                    type='button'
                    onClick={() => {
                      const api = gridApiRefs.current[index];
                      downloadPdf(gridData, api);
                    }}
                  >
                    <HelixIcon icon={document_pdf} /> Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function App() {
  // Register pdfmake fonts
  React.useEffect(() => {
    pdfMake.vfs = pdfFonts.vfs;
  }, []);
  const { setPrompt, responses, isLoading, setResponses } = useAI();
  const [showHistory, setShowHistory] = React.useState(false);
  const [previousPageContext, setPreviousPageContext] = React.useState<
    "default" | "results"
  >("default");

  // Update previous page context when responses change (but not when showing history)
  React.useEffect(() => {
    if (!showHistory) {
      const currentContext = responses.length > 0 ? "results" : "default";
      setPreviousPageContext(currentContext);
    }
  }, [responses.length, showHistory]);

  // Loading states for cycling messages
  const [loadingMessageIndex, setLoadingMessageIndex] = React.useState(0);
  const loadingMessages = [
    "Analyzing your request...",
    "Searching contacts...",
    "Searching transactions...",
    "Querying database...",
    "Compiling results...",
  ];

  // Cycle through loading messages
  React.useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 1500); // Change message every 1.5 seconds
      return () => clearInterval(interval);
    } else {
      setLoadingMessageIndex(0); // Reset when not loading
    }
  }, [isLoading]);

  // Helper to create pdfMake doc instance for grid data
  const getPdfDoc = (gridData: any, gridApi?: any) => {
    let headerRow: any[] = [];
    const rows: any[] = [];
    let widths: any[] = [];
    if (gridApi && typeof gridApi.getAllDisplayedColumns === "function") {
      const columns = gridApi.getAllDisplayedColumns();
      headerRow = columns.map((column: any) => {
        const colDef = column.getColDef();
        const headerName = colDef.headerName ?? colDef.field;
        return {
          text: headerName,
          bold: true,
          margin: [0, 12, 0, 0],
        };
      });
      widths = Array(columns.length).fill(`${100 / columns.length}%`);
      gridApi.forEachNodeAfterFilterAndSort((node: any) => {
        const row = columns.map((column: any) => {
          const value = gridApi.getValue(column, node);
          return { text: value ?? "" };
        });
        rows.push(row);
      });
    } else {
      // Fallback: use gridData
      const columns = gridData.columnDefs.map((col: any) => col.headerName);
      headerRow = columns.map((col: string) => ({
        text: col,
        bold: true,
        margin: [0, 12, 0, 0],
      }));
      widths = Array(columns.length).fill("auto");
      gridData.rowData.forEach((row: any) => {
        rows.push(
          columns.map((col: string) => {
            const field = col.toLowerCase().replace(/\s+/g, "_");
            return { text: row[field] !== undefined ? String(row[field]) : "" };
          })
        );
      });
    }
    const HEADER_ROW_COLOR = "#f8f8f8";
    const EVEN_ROW_COLOR = "#fcfcfc";
    const ODD_ROW_COLOR = "#fff";
    const PDF_INNER_BORDER_COLOR = "#dde2eb";
    const PDF_OUTER_BORDER_COLOR = "#babfc7";
    const createLayout = (numberOfHeaderRows: number) => ({
      fillColor: (rowIndex: number) => {
        if (rowIndex < numberOfHeaderRows) {
          return HEADER_ROW_COLOR;
        }
        return rowIndex % 2 === 0 ? EVEN_ROW_COLOR : ODD_ROW_COLOR;
      },
      vLineWidth: (rowIndex: number, node: any) =>
        rowIndex === 0 || rowIndex === node.table.widths.length ? 1 : 0,
      hLineColor: (rowIndex: number, node: any) =>
        rowIndex === 0 || rowIndex === node.table.body.length
          ? PDF_OUTER_BORDER_COLOR
          : PDF_INNER_BORDER_COLOR,
      vLineColor: (rowIndex: number, node: any) =>
        rowIndex === 0 || rowIndex === node.table.widths.length
          ? PDF_OUTER_BORDER_COLOR
          : PDF_INNER_BORDER_COLOR,
    });
    const docDefinition = {
      pageOrientation: "landscape" as const,
      pageMargins: [10, 10, 10, 10] as [number, number, number, number],
      content: [
        { text: "LW AI Data Table", style: "header" },
        {
          table: {
            headerRows: 1,
            widths,
            body: [headerRow, ...rows],
            heights: (rowIndex: number) => (rowIndex === 0 ? 40 : 15),
          },
          layout: createLayout(1),
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10] as [number, number, number, number],
        },
      },
    };
    return pdfMake.createPdf(docDefinition);
  };

  // Download PDF
  const downloadPdf = (gridData: any, gridApi?: any) => {
    getPdfDoc(gridData, gridApi).download("lw-ai-data-table.pdf");
  };
  // Print PDF
  const printPdf = (gridData: any, gridApi?: any) => {
    getPdfDoc(gridData, gridApi).print();
  };
  // Email PDF (workaround: download then prompt user to attach)
  const emailPdf = (gridData: any, gridApi?: any) => {
    getPdfDoc(gridData, gridApi).getBuffer((buffer: any) => {
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lw-ai-data-table.pdf";
      a.click();
      setTimeout(() => {
        window.location.href =
          "mailto:?subject=LW AI Data Table&body=Please find the PDF attached.";
      }, 1000);
    });
  };
  const [expandedGrid, setExpandedGrid] = React.useState<null | {
    index: number;
    gridData: any;
  }>(null);
  const [pendingPrompt, setPendingPrompt] = React.useState<string>("");

  React.useEffect(() => {
    if (!isLoading && responses.length > 0 && pendingPrompt) {
      setPendingPrompt("");
    }
  }, [isLoading, responses.length, pendingPrompt]);
  const samplePrompts = [
    {
      short: "Clients with multiple transactions (May 2024-2025)",
      full: "Show all clients who have more than one transaction created between May 1, 2025, and May 30, 2024. Include the client name and the total number of transactions, sorted in descending order by the transaction count",
    },
    {
      short: "High-value transactions (Oct 2024 - today)",
      full: "Show all transactions created between October 15 2024 and today where the purchase price is at least 2 million and the signing count is 5 or more. Include client name, user name, transaction ID, purchase price, and signing count. Order by client name and user name.",
    },
    {
      short: "Top 10 agents from Main Branch 25.07",
      full: 'Show the top 10 agents from the office named "Main Branch 25.07" based on the number of transactions. Include the office name, user_key, agent full name, and total transactions, sorted by total transactions in descending order.',
    },
  ];

  const handleSamplePromptClick = (prompt: { short: string; full: string }) => {
    setPrompt(prompt.full);
    setPendingPrompt(prompt.full);
  };

  // Store grid APIs for each grid instance
  const gridApiRefs = React.useRef<{ [key: number]: any }>({});

  // Auto-size columns and store API
  const onGridReady = (params: any, index?: number) => {
    // Use a small delay to ensure the container has its final dimensions
    setTimeout(() => {
      // First auto-size all columns except the last one
      const allColumns = params.api.getAllDisplayedColumns();
      if (allColumns.length > 1) {
        const columnsToAutoSize = allColumns.slice(0, -1); // All except last
        params.api.autoSizeColumns(
          columnsToAutoSize.map((col: any) => col.getColId())
        );
      }
      // Then size all columns to fit (this will make the flex column fill remaining space)
      params.api.sizeColumnsToFit();
    });
    if (typeof index === "number") {
      gridApiRefs.current[index] = params.api;
    }
    console.log("Auto-sized columns for grid.", params);
  };

  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [responses.length, isLoading]);

  return (
    <PageWrapper
      showHistory={showHistory}
      setShowHistory={setShowHistory}
      previousPageContext={previousPageContext}
      setResponses={setResponses}
    >
      <div className='helix-d-flex helix-justify--center'>
        <div
          className={`helix-d-flex helix-flex-direction--column helix-justify--center helix-align--middle helix-flex-column helix-gap-4  ${
            responses.length === 0 ? styles.landingPage : styles.fullHeight
          } helix-py-4 helix-w-100-percent helix-max-w-800`}
        >
          {/* History Section - Inline */}
          {showHistory && (
            <div className='helix-d-flex helix-flex-direction--column helix-w-100-percent helix-h-100-percent'>
              <div className='helix-mb-4 helix-text--center'>
                <h2 className='helix-mb-0'>History</h2>
              </div>
              <History onSelectConversation={() => setShowHistory(false)} />
            </div>
          )}

          {/* Main Content - Hidden when history is shown */}
          {!showHistory && (
            <>
              {/* Initial landing state (no responses, not loading) */}
              {responses.length === 0 && !isLoading && (
                <>
                  <img
                    src='https://assets.lwolf.com/img/lw-logo-dark.svg'
                    alt='LW Logo'
                    width={88}
                  />
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='224'
                    height='40'
                    viewBox='0 0 224 40'
                    className='Navbar_logo__6aaq5 helix-mb-4'
                    aria-label='Lone Wolf'
                  >
                    <path
                      fill='#233d2d'
                      d='M27.6 30.4h.8l-3.3 9H.1v-.3l2-2.7V4.9L0 2.2v-.3h12.2v.3l-2 2.7v33.4h7.9l9.4-7.9ZM54.8 26c0 8.4-5.7 14-13.4 14s-13.3-5.6-13.3-13.5c0-8.4 5.7-14 13.5-14S54.8 18.1 54.8 26m-8.7.3c0-9-1.4-12.7-4.7-12.7s-4.7 3.8-4.7 12.7S38.1 39 41.4 39s4.7-3.8 4.7-12.7m35.5-6.2c0-4.6-2.6-7.7-7.1-7.7s-7 2.5-8.8 5V13h-9.3v.3l1.5 3.5v19.9l-1.6 2.5v.3h11v-.3l-1.6-2.5V18.2c.7-.4 1.9-.9 3.5-.9 2.6 0 4.6 1.2 4.6 4.5v14.9l-1.6 2.5v.3h10.9v-.3l-1.6-2.5V20.2ZM108 32.2l.4.4c-1.4 3.6-4.9 7.4-11.3 7.4-7.6 0-12.6-5.5-12.6-13.2s5.4-14.3 12.7-14.3 10.3 4 10.9 9.9H91.3c0 6.9 3 11.9 10 11.9s5.3-.9 6.6-2.1ZM91.4 21.3h8.8c-.3-5.3-1.5-7.6-4.2-7.6s-4.4 2.2-4.6 7.6M169 2.2v-.3h-6.5v.3l1.4 6.1-7 27-8.6-30.2.8-2.9v-.3h-11.7v.3l2.2 3.1 2.6 8.9-5.5 21.2L128 5.1l.8-2.9v-.3h-11.7v.3l2.2 3.1 9.9 34.1h7.8l5.9-22.9 6.6 22.9h7.7l8.2-31.1 3.7-6.1ZM191.2 26c0 8.4-5.7 14-13.4 14s-13.3-5.6-13.3-13.5c0-8.4 5.7-14 13.5-14s13.2 5.6 13.2 13.5m-8.6.3c0-9-1.4-12.7-4.7-12.7s-4.7 3.8-4.7 12.7 1.4 12.7 4.7 12.7 4.7-3.8 4.7-12.7M202.1 0l-9.7 1.7V2l2 3.6v31.2l-1.6 2.5v.3h11v-.3l-1.6-2.5V0Zm11.4 4.1c-2.8 2.1-5.6 5.3-5.6 8.9h-3.3v2.6h3.3v21.1l-1.6 2.5v.3h11.1v-.3l-1.7-2.5V15.6h6.7V13h-7V6.3h8.6V.2c-4.1 0-7.6 1.7-10.5 3.9'
                    ></path>
                  </svg>

                  <div className='helix-d-flex helix-flex-direction--column helix-gap-4 helix-w-full helix-max-w-600'>
                    <h4 className='helix-my-4'>How can I help you today?</h4>
                    {samplePrompts.map((p, index) => (
                      <button
                        className={`helix-btn helix-btn--small helix-btn--ghost helix-text--left helix-text-black ${styles.samplePrompt}`}
                        key={p.short}
                        onClick={() => handleSamplePromptClick(p)}
                        title={p.full}
                        style={
                          {
                            "--shimmer-delay": `${index * 0.6}s`,
                          } as React.CSSProperties
                        }
                      >
                        <HelixIcon icon={search} className='helix-mr-2' />
                        {p.short}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {/* Show skeleton loader, timestamp, and question immediately after submit (loading) */}
              {isLoading && (
                <div className={styles.chatContainer}>
                  <div className={styles.chatScroll} ref={chatScrollRef}>
                    {/* Timestamp for loading state */}
                    {(() => {
                      const ts = new Date();
                      const now = new Date();
                      const isToday =
                        ts.getDate() === now.getDate() &&
                        ts.getMonth() === now.getMonth() &&
                        ts.getFullYear() === now.getFullYear();
                      const timeStr = ts.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const formattedTime = isToday
                        ? `Today at ${timeStr}`
                        : `${ts.toLocaleDateString()} at ${timeStr}`;
                      return (
                        <div className='helix-small helix-text-gray-600 helix-text--center helix-py-2'>
                          {formattedTime}
                        </div>
                      );
                    })()}
                    {/* If there are previous responses, show last prompt and response, then loader */}
                    {responses.length > 0 ? (
                      <>
                        {responses.map((item, index) => (
                          <div
                            key={index}
                            className='helix-d-flex helix-flex-direction--column helix-gap-3'
                          >
                            <ResponseItem
                              item={item}
                              index={index}
                              onGridReady={onGridReady}
                              setExpandedGrid={setExpandedGrid}
                              printPdf={printPdf}
                              emailPdf={emailPdf}
                              downloadPdf={downloadPdf}
                              gridApiRefs={gridApiRefs}
                              showExportButtons={false}
                            />
                          </div>
                        ))}
                        {/* New skeleton loader for next response */}
                        <div className='helix-w-100-percent helix-card helix-p-4'>
                          <div
                            className={`helix-mb-3 helix-text-gray-600 helix-small ${styles.shimmerText}`}
                          >
                            {loadingMessages[loadingMessageIndex]}
                          </div>
                          <SkeletonBox
                            className='helix-mb-2'
                            boxWidth='100%'
                            length={3}
                          />
                        </div>
                      </>
                    ) : (
                      // If no previous responses, show pending prompt and loader only
                      <>
                        {/* Show pending prompt during loading, right-aligned like user bubble */}
                        {pendingPrompt && (
                          <div className='helix-d-flex helix-align--end helix-flex-direction--column helix-w-100-percent'>
                            <div className={styles.userRow}>
                              <div style={{ flex: 1 }}>
                                <div className='helix-bg-gray-200 helix-border-radius-top--md helix-border-radius-left--md helix-p-3 helix-bg--primary helix-color--white helix-w-100-percent'>
                                  <div>{pendingPrompt}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Skeleton loader */}
                        <div className='helix-w-100-percent helix-card helix-p-4'>
                          <div
                            className={`helix-mb-3 helix-text-gray-600 helix-small ${styles.shimmerText}`}
                          >
                            {loadingMessages[loadingMessageIndex]}
                          </div>
                          <SkeletonBox
                            className='helix-mb-2'
                            boxWidth='100%'
                            length={3}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Show chat content after loading is done and responses exist */}
              {responses.length > 0 && !isLoading && (
                <div className={styles.chatContainer}>
                  <div className={styles.chatScroll} ref={chatScrollRef}>
                    {responses.length > 0 &&
                      (() => {
                        const ts = responses[0].timestamp;
                        const now = new Date();
                        const isToday =
                          ts.getDate() === now.getDate() &&
                          ts.getMonth() === now.getMonth() &&
                          ts.getFullYear() === now.getFullYear();
                        const timeStr = ts.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const formattedTime = isToday
                          ? `Today at ${timeStr}`
                          : `${ts.toLocaleDateString()} at ${timeStr}`;
                        return (
                          <div className='helix-small helix-text-gray-600  helix-text--center helix-py-2'>
                            {formattedTime}
                          </div>
                        );
                      })()}

                    {/* Alert before first response */}

                    {responses.map((item, index) => (
                      <div
                        key={index}
                        className='helix-d-flex helix-flex-direction--column helix-gap-3'
                      >
                        <ResponseItem
                          item={item}
                          index={index}
                          onGridReady={onGridReady}
                          setExpandedGrid={setExpandedGrid}
                          printPdf={printPdf}
                          emailPdf={emailPdf}
                          downloadPdf={downloadPdf}
                          gridApiRefs={gridApiRefs}
                          showExportButtons={true}
                        />
                      </div>
                    ))}
                  </div>
                  <div className={styles.gradientTop} />
                  <div className={styles.gradientBottom} />
                  {/* Full screen AG-Grid modal */}
                  {expandedGrid && (
                    <div className={styles.modalOverlay}>
                      <div className={styles.modalContent}>
                        <div className='helix-d-flex helix-justify--end helix-align--center helix-mb-2'>
                          <button
                            className='helix-btn helix-btn--sm helix-btn--ghost'
                            type='button'
                            onClick={() => setExpandedGrid(null)}
                          >
                            <HelixIcon icon={x} />
                          </button>
                        </div>
                        <div
                          className={styles.modalGridScroll}
                          style={{
                            height: "calc(100% - 80px)",
                          }}
                        >
                          <AGGridHelix
                            height='100%'
                            columnDefs={expandedGrid.gridData.columnDefs as any}
                            rowData={expandedGrid.gridData.rowData}
                            onGridReady={onGridReady}
                          />
                        </div>
                        <div className='helix-d-flex helix-gap-2 helix-mt-2'>
                          <button
                            className='helix-btn helix-btn--sm helix-btn--ghost'
                            type='button'
                            onClick={() => {
                              printPdf(expandedGrid.gridData);
                            }}
                          >
                            <HelixIcon icon={printer} /> Print PDF
                          </button>
                          <button
                            className='helix-btn helix-btn--sm helix-btn--ghost'
                            type='button'
                            onClick={() => {
                              emailPdf(expandedGrid.gridData);
                            }}
                          >
                            <HelixIcon icon={email} /> Email PDF
                          </button>
                          <button
                            className='helix-btn helix-btn--sm helix-btn--ghost'
                            type='button'
                            onClick={() => {
                              downloadPdf(expandedGrid.gridData);
                            }}
                          >
                            <HelixIcon icon={document_pdf} /> Download PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {!showHistory && (
            <PromptInput
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              setPreviousPageContext={setPreviousPageContext}
            />
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

export default App;
