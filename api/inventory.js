const AIRTABLE_EMBED_URL =
  "https://airtable.com/embed/appejU4ScV5Gi8rMt/shrH4e4r8hqGDZc4D?backgroundColor=blue&viewControls=on";
const AIRTABLE_ORIGIN = "https://airtable.com";
const INVENTORY_TABLE_ID = "tbl1Uo93RVAf8bNMt";

function splitSetCookie(headerValue) {
  if (!headerValue) {
    return [];
  }

  return headerValue.split(/,(?=\s*[^;=]+=)/g);
}

function parseScriptString(value) {
  return JSON.parse(`"${value}"`);
}

function compactSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCellValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return item.foreignRowDisplayName || item.name || item.id || "";
        }

        return item;
      })
      .filter(Boolean)
      .join(", ");
  }

  return value ?? "";
}

function normalizeInventory(payload) {
  const data = payload.data || {};
  const table = (data.tableSchemas || []).find((item) => item.id === INVENTORY_TABLE_ID);
  const tableData = (data.tableDatas || []).find((item) => item.id === INVENTORY_TABLE_ID);

  if (!table || !tableData) {
    return [];
  }

  const columnNameById = Object.fromEntries(table.columns.map((column) => [column.id, column.name]));

  return tableData.rows.map((row) => {
    const values = {};

    for (const [columnId, rawValue] of Object.entries(row.cellValuesByColumnId || {})) {
      values[columnNameById[columnId] || columnId] = normalizeCellValue(rawValue);
    }

    return {
      id: row.id,
      sku: values.SKU || "",
      brand: values.Brand || "",
      tireSize: values["Tire Size"] || "",
      quantity: Number(values["Current Stock Quantity"] || 0),
      reorderThreshold: Number(values["Reorder Threshold"] || 0),
      location: values.Location || "",
      supplier: values.Supplier || "",
      alert: values["Low Stock Alert"] || "",
      notes: values.Notes || "",
      lastRestockedDate: values["Last Restocked Date"] || "",
    };
  });
}

function filterRecords(records, query) {
  const normalizedQuery = compactSearch(query);

  if (!normalizedQuery) {
    return records;
  }

  return records.filter((record) => {
    const haystack = compactSearch(
      [
        record.sku,
        record.brand,
        record.tireSize,
        record.location,
        record.supplier,
        record.alert,
        record.notes,
      ].join(" ")
    );

    return haystack.includes(normalizedQuery);
  });
}

async function getAirtableInventory() {
  const embedResponse = await fetch(AIRTABLE_EMBED_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!embedResponse.ok) {
    throw new Error(`Airtable embed returned ${embedResponse.status}`);
  }

  const html = await embedResponse.text();
  const cookieHeader = splitSetCookie(embedResponse.headers.get("set-cookie"))
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
  const headersMatch = html.match(/var headers = (\{.*?\});/);
  const urlMatch = html.match(/urlWithParams:\s*"((?:\\.|[^"])*)"/);

  if (!headersMatch || !urlMatch) {
    throw new Error("Airtable shared view did not expose inventory request metadata");
  }

  const airtableHeaders = JSON.parse(headersMatch[1]);
  airtableHeaders["x-airtable-accept-msgpack"] = "false";
  airtableHeaders["x-time-zone"] = "America/Denver";
  airtableHeaders.accept = "application/json";
  airtableHeaders.referer = AIRTABLE_EMBED_URL;

  if (cookieHeader) {
    airtableHeaders.cookie = cookieHeader;
  }

  delete airtableHeaders.traceparent;
  delete airtableHeaders.tracestate;

  const apiPath = parseScriptString(urlMatch[1]).replace(
    "allowMsgpackOfResult%22%3Atrue",
    "allowMsgpackOfResult%22%3Afalse"
  );
  const inventoryResponse = await fetch(`${AIRTABLE_ORIGIN}${apiPath}`, {
    headers: airtableHeaders,
  });

  if (!inventoryResponse.ok) {
    throw new Error(`Airtable inventory returned ${inventoryResponse.status}`);
  }

  return normalizeInventory(await inventoryResponse.json());
}

module.exports = async function inventoryHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=600");

  try {
    const query = typeof req.query?.q === "string" ? req.query.q.trim() : "";
    const records = await getAirtableInventory();
    const filteredRecords = filterRecords(records, query);

    res.status(200).json({
      source: "airtable",
      updatedAt: new Date().toISOString(),
      total: records.length,
      count: filteredRecords.length,
      records: filteredRecords,
    });
  } catch (error) {
    res.status(502).json({
      source: "airtable",
      error: "Unable to load Airtable inventory",
      message: error.message,
      records: [],
    });
  }
};
