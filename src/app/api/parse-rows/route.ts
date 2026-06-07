import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { rowsText, mode = "master" } = await request.json();

    if (!rowsText || !rowsText.trim()) {
      return NextResponse.json({ success: false, error: "No text data provided" }, { status: 400 });
    }

    console.log(`=== API Route /api/parse-rows called (Mode: ${mode}) ===`);
    console.log("Input text size:", rowsText.length, "characters");

    let apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.substring(1, apiKey.length - 1);
    }
    if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
      apiKey = apiKey.substring(1, apiKey.length - 1);
    }
    apiKey = apiKey.trim();

    if (!apiKey) {
      console.error("Missing GROQ_API_KEY environment variable");
      return NextResponse.json({ success: false, error: "Groq API key is not configured" }, { status: 500 });
    }

    let criticalFieldsText = "";
    if (mode === "teachers") {
      criticalFieldsText = `
   - grade_level
   - section
   - teacher_name
   - subject`;
    } else if (mode === "students") {
      criticalFieldsText = `
   - grade_level
   - section
   - student_name
   - roll_id
   - parent_name
   - parent_phone`;
    } else {
      criticalFieldsText = `
   - school_name
   - academic_year
   - grade_level
   - section
   - base_fee
   - teacher_name
   - subject
   - student_name
   - roll_id
   - parent_name
   - parent_phone`;
    }

    const prompt = `You are a highly precise school administrative data extractor.
You will receive a batch of spreadsheet rows (CSV or tab-separated text).
Your task is to parse each row and extract a structured JSON object containing a "data" array of records.

For each record in the "data" array, extract:
- school_name (string, or null if missing)
- academic_year (string, or null if missing)
- admin_name (string, or null if missing)
- grade_level (string, or null if missing; extract grade number or name, e.g. "Grade 10", "Grade 1")
- section (string, or null if missing; e.g. "A", "B")
- base_fee (number, or null if missing; e.g. 15000)
- teacher_name (string, or null if missing; e.g. "Susan Smith")
- subject (string, or null if missing; e.g. "Maths")
- student_name (string, or null if missing; e.g. "Rahul Sharma")
- student_email (string, or null if missing; e.g. "rahul@gmail.com")
- roll_id (number, or null if missing; e.g. 1)
- parent_name (string, or null if missing; e.g. "Sanjay Sharma")
- parent_email (string, or null if missing; e.g. "sanjay@gmail.com")
- parent_phone (string, or null if missing; e.g. "9876543210")

CRITICAL RULES:
1. ANTI-SHIFTING: Never shift columns or cells to the left. If a column value is missing, you must output null for that field. For example, if a parent's name is missing, but parent's email is present, parent_name must be null, NOT the parent's email or parent's phone.
2. INCOMPLETE FLAG: For each row, check if any of the following critical fields are missing (i.e. null):${criticalFieldsText}
   If any of these fields are null, set "status": "incomplete" and append the missing field names to "missing_fields". Otherwise, set "status": "complete" and "missing_fields" to [].
3. Output must be a valid JSON object with a "data" key holding the array of parsed records matching the schema.
4. STRICT COMMA COUNTING: Treat every single comma as a hard boundary. If you see text like "Elena Rostova,,Tanya Singh", index N is "Elena Rostova", index N+1 is null, and index N+2 MUST be "Tanya Singh". Never drop a string value or assign a populated text field to null.

Input rows to parse:
${rowsText}`;



    // Invoke Groq API (llama-3.3-70b-versatile is highly capable and fast)
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.0,
        response_format: {
          type: "json_object",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API request failed with status:", response.status, response.statusText);
      console.error("Raw Error Response:", errText);
      try {
        const parsedError = JSON.parse(errText);
        if (parsedError.error) {
          console.error("Parsed Groq Error Status:", parsedError.error.code);
          console.error("Parsed Groq Error Message:", parsedError.error.message);
        }
      } catch (e) {
        console.error("Failed to parse error body as JSON:", e);
      }
      return NextResponse.json({ success: false, error: `Groq API error: ${response.statusText}` }, { status: 502 });
    }

    const resJson = await response.json();
    const generatedText = resJson.choices?.[0]?.message?.content;



    if (!generatedText) {
      return NextResponse.json({ success: false, error: "Empty response from Groq API" }, { status: 502 });
    }

    try {
      const parsedJson = JSON.parse(generatedText.trim());
      const parsedRows = parsedJson.data || [];
      return NextResponse.json({
        success: true,
        data: parsedRows,
        debugPrompt: prompt,
        debugResponse: generatedText
      });
    } catch (parseErr) {
      console.error("Failed to parse Groq output as JSON:", generatedText);
      return NextResponse.json({ success: false, error: "Malformed response format from AI" }, { status: 502 });
    }
  } catch (e: any) {
    console.error("Error in parse-rows route:", e);
    return NextResponse.json({ success: false, error: e.message || "Internal server error" }, { status: 500 });
  }
}
