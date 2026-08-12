const API_URL = "http://localhost:5000/api";

const runTest = async (name, url, options, expectedStatus, expectedErrorCode) => {
    try {
        console.log(`\n--- Test: ${name} ---`);
        const response = await fetch(url, options);
        const data = await response.json();
        
        console.log(`Status Code: ${response.status} (Expected: ${expectedStatus})`);
        
        if (data.success !== false) {
            console.error("❌ FAILED: Expected success to be false, got", data.success);
            return;
        }

        const code = data.error?.code;
        console.log(`Error Code: ${code} (Expected: ${expectedErrorCode})`);

        if (response.status === expectedStatus && code === expectedErrorCode) {
            console.log("✅ PASSED");
        } else {
            console.error("❌ FAILED: Status or Code mismatch");
            console.error("Response:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("❌ FAILED: Exception thrown", err.message);
    }
};

const executeTests = async () => {
    // Test 1: Validation Error (422) - missing required fields in register
    await runTest(
        "Validation Error (422)",
        `${API_URL}/auth/register`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}) // empty body
        },
        422,
        "VALIDATION_ERROR"
    );

    // Test 2: Missing Authentication (401)
    await runTest(
        "Missing Authentication (401)",
        `${API_URL}/users/me`,
        {
            method: "GET"
        },
        401,
        "AUTH_REQUIRED"
    );

    // Test 3: Unknown Route (404)
    await runTest(
        "Unknown Route (404)",
        `${API_URL}/this-route-does-not-exist`,
        {
            method: "GET"
        },
        404,
        "ROUTE_NOT_FOUND"
    );
};

executeTests();
