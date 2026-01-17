import { NextResponse } from "next/server"

export async function GET() {
  try {
    // 信息保护条款内容
    const clause = {
      title: "Information Clause",
      content: `
        <h2>Information Clause - Newsletter Subscription</h2>
        
        <p><strong>Data Controller:</strong> BlazeRobotics</p>
        
        <p><strong>Purpose of Data Processing:</strong></p>
        <ul>
          <li>To send newsletter updates about our products, services, and educational content</li>
          <li>To respond to your inquiries</li>
          <li>To provide information about courses, events, and promotions</li>
        </ul>
        
        <p><strong>Legal Basis:</strong> Your consent (Article 6(1)(a) of GDPR)</p>
        
        <p><strong>Data Recipients:</strong> Your personal data will be processed by BlazeRobotics and may be shared with trusted service providers who assist in email delivery, subject to appropriate data protection agreements.</p>
        
        <p><strong>Data Retention:</strong> Your email address will be stored until you unsubscribe from the newsletter. You can unsubscribe at any time by clicking the unsubscribe link in any newsletter email.</p>
        
        <p><strong>Your Rights:</strong></p>
        <ul>
          <li>Right to access your personal data</li>
          <li>Right to rectify inaccurate data</li>
          <li>Right to erasure ("right to be forgotten")</li>
          <li>Right to restrict processing</li>
          <li>Right to data portability</li>
          <li>Right to object to processing</li>
          <li>Right to withdraw consent at any time</li>
        </ul>
        
        <p><strong>Contact:</strong> If you have any questions about how we process your personal data or wish to exercise your rights, please contact us at privacy@blazerobotics.com</p>
        
        <p><strong>Complaint:</strong> You have the right to lodge a complaint with a supervisory authority if you believe that the processing of your personal data violates applicable data protection laws.</p>
      `,
    }

    return NextResponse.json(clause, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching information clause:", error)
    return NextResponse.json(
      { error: "Failed to fetch information clause" },
      { status: 500 }
    )
  }
}
