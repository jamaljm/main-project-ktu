import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import NewsletterCard from "@/components/Speech";

export default function Home() {
  const certificates = [
    {
      type: "Caste",
      description: "Official document certifying your caste status",
      icon: "📜",
    },
    {
      type: "Income",
      description: "Proof of annual income certification",
      icon: "💰",
    },
    {
      type: "Domicile",
      description: "Verify your residential status in Kerala",
      icon: "🏠",
    },
    {
      type: "Birth",
      description: "Official birth registration certificate",
      icon: "👶",
    },
    {
      type: "Death",
      description: "Death registration certification",
      icon: "📋",
    },
    {
      type: "Marriage",
      description: "Legal marriage registration certificate",
      icon: "💑",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white">
      <Navigation />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative h-[500px] bg-green-800">
          <div className="absolute inset-0 bg-[url('/kerala-bg.jpg')] bg-cover bg-center opacity-20" />
          <div className="relative max-w-7xl mx-auto py-20 px-4 flex flex-col items-center justify-center h-full text-white text-center">
            <h1 className="text-5xl font-bold mb-6 animate-fade-in">
              Kerala Government Certificate Services
            </h1>
            <p className="text-xl mb-8 max-w-2xl">
              Your gateway to hassle-free certificate applications. Fast,
              secure, and efficient government services at your fingertips.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-green-800 hover:bg-green-100"
            >
              <Link href="/apply">Apply Now</Link>
            </Button>
          </div>
        </div>

        {/* Certificate Cards Section */}
        <div className="max-w-7xl mx-auto py-16 px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-green-900">
            Available Certificates
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Choose from our range of government-issued certificates. Quick
            processing and secure verification.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                type: "Caste",
                description: "Official document certifying your caste status",
                icon: "📜",
                color: "bg-purple-50",
                iconColor: "text-purple-600",
                borderColor: "border-purple-200",
                hoverColor: "hover:border-purple-300",
              },
              {
                type: "Income",
                description: "Proof of annual income certification",
                icon: "💰",
                color: "bg-blue-50",
                iconColor: "text-blue-600",
                borderColor: "border-blue-200",
                hoverColor: "hover:border-blue-300",
              },
              {
                type: "Domicile",
                description: "Verify your residential status in Kerala",
                icon: "🏠",
                color: "bg-green-50",
                iconColor: "text-green-600",
                borderColor: "border-green-200",
                hoverColor: "hover:border-green-300",
              },
              {
                type: "Birth",
                description: "Official birth registration certificate",
                icon: "👶",
                color: "bg-pink-50",
                iconColor: "text-pink-600",
                borderColor: "border-pink-200",
                hoverColor: "hover:border-pink-300",
              },
              {
                type: "Death",
                description: "Death registration certification",
                icon: "📋",
                color: "bg-gray-50",
                iconColor: "text-gray-600",
                borderColor: "border-gray-200",
                hoverColor: "hover:border-gray-300",
              },
              {
                type: "Marriage",
                description: "Legal marriage registration certificate",
                icon: "💑",
                color: "bg-red-50",
                iconColor: "text-red-600",
                borderColor: "border-red-200",
                hoverColor: "hover:border-red-300",
              },
            ].map((cert) => (
              <HoverCard key={cert.type}>
                <HoverCardTrigger asChild>
                  <Card
                    className={`transition-all cursor-pointer border-2 ${cert.color} ${cert.borderColor} ${cert.hoverColor} group`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${cert.color} group-hover:scale-110 transition-transform text-2xl`}
                        >
                          {cert.icon}
                        </div>
                        <span className="text-gray-800">
                          {cert.type} Certificate
                        </span>
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {cert.description}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        asChild
                        className={`w-full bg-white border-2 ${cert.borderColor} ${cert.iconColor} hover:bg-opacity-90 transition-colors`}
                        variant="outline"
                      >
                        <Link
                          href="/apply"
                          className="flex items-center justify-center gap-2"
                        >
                          Apply Now
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="group-hover:translate-x-1 transition-transform"
                          >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent
                  className={`w-80 border-2 ${cert.borderColor}`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">
                          {cert.type} Certificate
                        </h4>
                        <p className="text-sm text-gray-600">
                          Processing time: 5-7 working days
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${cert.color} text-2xl`}>
                        {cert.icon}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 mb-2">
                        Required Documents
                      </h5>
                      <ul className="text-sm space-y-1 list-disc pl-4 text-gray-600">
                        <li>Valid ID Proof (Aadhaar/Voter ID)</li>
                        <li>Address Proof (Ration Card/Utility Bill)</li>
                        <li>Recent Passport Size Photographs</li>
                        {cert.type === "Income" && (
                          <li>Latest Income Tax Return</li>
                        )}
                        {cert.type === "Caste" && (
                          <li>Previous Caste Certificate (if any)</li>
                        )}
                        {cert.type === "Marriage" && (
                          <li>Both parties' ID proofs</li>
                        )}
                      </ul>
                    </div>
                    <div className={`p-3 rounded-lg ${cert.color} mt-4`}>
                      <h5 className="text-sm font-semibold text-gray-800 mb-1">
                        Application Fee
                      </h5>
                      <p className="text-sm text-gray-600">
                        ₹100
                        {cert.type === "Marriage" &&
                          " (Additional stamp duty may apply)"}
                      </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>

        {/* Process Section */}
        <div className="bg-green-50 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              How to Apply
            </h2>
            <Carousel className="max-w-3xl mx-auto">
              <CarouselContent>
                {["Register", "Fill Form", "Upload Docs", "Submit"].map(
                  (step, index) => (
                    <CarouselItem key={step} className="md:basis-1/2">
                      <Card className="h-full">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center">
                              {index + 1}
                            </span>
                            {step}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600">
                            {getStepDescription(step)}
                          </p>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  )
                )}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto py-16 px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Us
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Fast Processing",
                icon: "⚡",
                description:
                  "Get your certificates processed quickly and efficiently",
              },
              {
                title: "Secure & Safe",
                icon: "🔒",
                description:
                  "Your data is protected with enterprise-grade security",
              },
              {
                title: "24/7 Support",
                icon: "💬",
                description: "Round-the-clock assistance for all your queries",
              },
            ].map((feature) => (
              <Card key={feature.title} className="text-center">
                <CardHeader>
                  <CardTitle>
                    <span className="text-4xl mb-4 block">{feature.icon}</span>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="bg-green-50 py-16 px-4">
          <NewsletterCard />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function getStepDescription(step: string): string {
  switch (step) {
    case "Register":
      return "Create your account with basic details";
    case "Fill Form":
      return "Complete the application with required information";
    case "Upload Docs":
      return "Upload supporting documents and photos";
    case "Submit":
      return "Review and submit your application";
    default:
      return "";
  }
}
