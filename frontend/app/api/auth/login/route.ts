import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid corporate email address.",
        },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    // Standard session / JWT authentication response
    return NextResponse.json({
      success: true,
      message: "Authentication successful.",
      data: {
        user: {
          id: "usr-01",
          name: "Jordan Davis",
          email,
          role: "Sustainability Director",
          organization: "Acme EcoCorp Inc.",
        },
        token: `mock_jwt_${Date.now()}`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication service encountered an unexpected error.",
      },
      { status: 500 }
    );
  }
}
