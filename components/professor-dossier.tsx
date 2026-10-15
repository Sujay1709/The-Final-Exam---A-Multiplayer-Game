import { ScrollText, Mail, FlaskConical } from "lucide-react";
export function ProfessorDossier() {
  return <section className="professor-dossier" aria-labelledby="dossier-title">
    <div className="dossier-heading"><span className="micro">RECOVERED PERSONNEL FILE</span><span className="dossier-seal">E.V.</span></div>
    <h3 id="dossier-title">A brilliant mind.<br/><em>An unopened past.</em></h3>
    <p className="dossier-lead">Before the locks, there was a name missing from a prize.</p>
    <ol className="dossier-timeline">
      <li><ScrollText size={20} aria-hidden="true"/><div><span className="micro">THIRTY YEARS AGO</span><h4>The missing credit</h4><p>Elias Voss built the research that won his college team a prize. When the certificate arrived without his name, he saw betrayal. He left before anyone could explain.</p></div></li>
      <li><Mail size={20} aria-hidden="true"/><div><span className="micro">THE YEARS BETWEEN</span><h4>The letters he never opened</h4><p>His friends wrote. Voss kept every envelope sealed. Their apology became, in his mind, evidence of a conspiracy. His laboratory filled with unanswered questions.</p></div></li>
      <li><FlaskConical size={20} aria-hidden="true"/><div><span className="micro">TONIGHT</span><h4>A reunion with no easy exit</h4><p>He invited the old team back and sealed five rooms. Every hidden object carries a riddle; every answer leads closer to the letter that could undo his grudge.</p></div></li>
    </ol>
    <blockquote>“You overlooked my name.<br/>Let’s see what else you overlook.”<cite>— Professor Elias Voss</cite></blockquote>
    <p className="dossier-footnote">Search carefully. The greatest treasure may be the truth he refused to read.</p>
  </section>;
}
