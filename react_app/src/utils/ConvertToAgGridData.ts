// helper function to convert markdown table to ag-Grid data format
export const convertToAgGridData = (markdown: string) => {
  const lines = markdown.split("\n").filter((line) => line.trim() !== "");

  // Find the table by looking for the header separator line (contains dashes)
  const separatorIndex = lines.findIndex(
    (line) => line.includes("|") && line.includes("-") && line.includes("-")
  );

  if (separatorIndex === -1 || separatorIndex === 0) {
    return { columnDefs: [], rowData: [] };
  }

  // The header is the line before the separator
  const headerLine = lines[separatorIndex - 1];
  const headers = headerLine
    .split("|")
    .map((header) => header.trim())
    .filter((header) => header !== "");

  // Check if the response indicates sorting requirements
  const responseText = markdown.toLowerCase();
  let sortField = null;
  let sortOrder = null;

  if (responseText.includes("sorted") && responseText.includes("descending")) {
    if (responseText.includes("transaction")) {
      // Find column that contains "transaction" in the name
      const transactionColumnIndex = headers.findIndex((header) =>
        header.toLowerCase().includes("transaction")
      );
      if (transactionColumnIndex !== -1) {
        sortField = headers[transactionColumnIndex]
          .toLowerCase()
          .replace(/\s+/g, "_");
        sortOrder = "desc";
      }
    }
  }

  const columnDefs = headers.map((header, index) => ({
    headerName: header,
    field: header.toLowerCase().replace(/\s+/g, "_"), // Create field names for ag-Grid
    sortable: true, // Make all columns sortable
    resizable: true, // Allow manual column resizing
    flex: index === headers.length - 1 ? 1 : undefined, // Last column takes remaining space
    sort:
      sortField === header.toLowerCase().replace(/\s+/g, "_")
        ? sortOrder
        : undefined,
  }));

  // Data rows start after the separator line
  const dataLines = lines.slice(separatorIndex + 1);
  const rowData = dataLines
    .filter((line) => line.includes("|") && !line.includes("*")) // Filter out non-table lines
    .map((line) => {
      const values = line
        .split("|")
        .map((value) => value.trim())
        .filter((value) => value !== "");

      const row: { [key: string]: string | number } = {};
      headers.forEach((header, index) => {
        const fieldName = header.toLowerCase().replace(/\s+/g, "_");
        const value = values[index] || "";

        // Convert numeric values from strings to numbers
        if (value !== "") {
          // Remove currency symbols and commas for number detection
          const cleanedValue = value.replace(/[$,]/g, "");

          // Check if it's a number (including decimals)
          if (/^\d+(\.\d+)?$/.test(cleanedValue)) {
            row[fieldName] = parseFloat(cleanedValue);
          } else {
            row[fieldName] = value;
          }
        } else {
          row[fieldName] = value;
        }
      });
      return row;
    });

  return { columnDefs, rowData };
};
