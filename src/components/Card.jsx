export default function Card({title, subtitle, children, className = ''}){
    return(
        <section className={`rounded-2x1 border border-gray-200 bg-white p-5 shadow-5m ${className}`}>
            {(title || subtitle) && (
                <div className="mb-4">
                    {title && <h2 className="text-lg font-semibold text-gray-900" >{title}</h2>}
                    {subtitle && <p className="mt-1 text-sm text-gray-500" >{subtitle}</p>}
                </div>
            )};
            {children}
        </section>
    );
};