export default function HomePage() {
    return (
        <div>
            <h1>Hello from Next.js</h1>
            <p>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
        </div>
    )
}