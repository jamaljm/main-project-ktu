export default function Footer() {
  return (
    <footer className="bg-green-900 text-white mt-12 py-8">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4">Quick Links</h3>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-green-300">About Us</a></li>
            <li><a href="#" className="hover:text-green-300">Services</a></li>
            <li><a href="#" className="hover:text-green-300">FAQs</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-4">Contact</h3>
          <p>Government Secretariat,</p>
          <p>Thiruvananthapuram, Kerala</p>
          <p>Phone: 0471-2321133</p>
        </div>
        <div>
          <p className="text-sm mt-4 border-t border-green-800 pt-4">
            © {new Date().getFullYear()} Kerala Government. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 