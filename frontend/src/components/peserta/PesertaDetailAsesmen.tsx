import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function PesertaDetailAsesmen() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    navigate('/peserta/asesmen', {
      replace: true,
      state: { programCode: id || 'BMRI-DATA-02' }
    });
  }, [id, navigate]);

  return null;
}
