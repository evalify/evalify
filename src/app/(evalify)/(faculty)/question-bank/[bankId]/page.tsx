type Props = {
    params: { bankId: string };
};

export default function Page({ params }: Props) {
    return <div>Question Bank Page - {params.bankId}</div>;
}
