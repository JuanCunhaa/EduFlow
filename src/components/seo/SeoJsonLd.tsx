/**
 * Renders a <script type="application/ld+json"> block for structured data.
 * Accepts a single schema object or an array.
 */
export function SeoJsonLd({ data }: { data: object | object[] }) {
    const items = Array.isArray(data) ? data : [data];
    return (
        <>
            {items.map((item, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
                />
            ))}
        </>
    );
}
