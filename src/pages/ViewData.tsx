import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { ChatBot } from '@/components/ChatBot';
import { useDashboardStore } from '@/store/dashboardStore';
import { fetchTableData, ValidationError } from '@/api/tableData';

const ViewData = () => {
  const navigate = useNavigate();
  const {
    selectedDatabase,
    setTableData,
    setLoading,
    setError,
  } = useDashboardStore();


  // Fetch table data when selectedDatabase changes
  useEffect(() => {
    if (!selectedDatabase) {
      navigate('/');
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTableData(selectedDatabase, 1000, 0);
        setTableData(data.data);
      } catch (err: any) {
        // Handle validation error from API
        if (err && err.detail) {
          const validation: ValidationError = err;
          setError(validation.detail.map((d) => d.msg).join(', '));
        } else if (err && err.message) {
          setError(err.message);
        } else {
          setError('Failed to fetch table data.');
        }
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDatabase, navigate, setTableData, setLoading, setError]);

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <div className="bg-white shadow-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
                className="border-2 hover:bg-muted transition-smooth"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Selection
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Database Management
                </h1>
                <p className="text-muted-foreground">
                  View and edit your database records
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <DataTable />
      </div>

      {/* Floating Chatbot */}
      <ChatBot />
    </div>
  );
};

export default ViewData;