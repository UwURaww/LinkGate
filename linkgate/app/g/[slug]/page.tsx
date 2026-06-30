import GateWizard from "@/components/GateWizard";

export default function GatePage({ params }: { params: { slug: string } }) {
  return <GateWizard slug={params.slug} />;
}
